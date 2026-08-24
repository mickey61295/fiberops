/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  PANEL_Stock  
; Change Person    :  ASLAM
; Last Change Date :  17/08/2022 10.20 AM 
; =============================================  */  

CREATE PROCEDURE PROC_Stock_ProdPanel_Update_ASM (@Id Int,@SizeId Int,@ProdPcs Int,@compid int,@oldpcs int)  AS  DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,  @StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int ,@OldId Int,@OldCoycode Int,@OldOrdid Int,@OldStyleNo Varchar(20),@OldStageId Int,@OldPartId Int,@OldGodId Int,@OldColId Int,    @OldSizeId Int,@OldStockQty Int,@OldSourceStageId Int,@OldFinalStage Char(1),@OldSeqNo int,@OldPartyId Int      ,@OldPcsStockId Int,@Rework Int,@RejectionTypeId Int ,@LotNo Varchar(15),@LotID int        
Select @OldId=@Id       
Select @OldCoycode = CoyId From Trs_AddPanelEntry Where Id=@OldId       
select @OldPartyId = 0       
SELECT @OldOrdid = OrdId From Trs_AddPanelEntry  Where Id=@OldId   
SELECT @OldStyleNo = StyleNo From Trs_AddPanelEntry Where Id=@OldId     
SELECT @OldStageid = StageId From Trs_AddPanelEntry Where Id=@OldId    
SELECT @OldPartId = PartId From Trs_AddPanelEntry Where Id=@OldId    
SELECT @OldGodId = GodId From Trs_AddPanelEntry Where Id=@OldId    
SELECT @Rework = Rework From Trs_AddPanelEntry Where Id=@OldId     
SELECT @RejectionTypeId = RejectionTypeId From Trs_AddPanelEntry Where Id=@OldId    Select @OldSeqNo = SeqNo From Trs_AddPanelEntry Inner Join Prod_Sequence On 
Trs_AddPanelEntry.OrdId=Prod_Sequence.OrdId And Trs_AddPanelEntry.StyleNo=Prod_Sequence.StyleNo And Trs_AddPanelEntry.StageId=Prod_Sequence.StageId    Where Id=@OldId    
SELECT @OldFinalStage = Mas_Dept.SemiFinish From Trs_AddPanelEntry Inner Join Mas_JobWrkComp On Trs_AddPanelEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_AddPanelEntry.Id=@OldId    
SELECT @OldColId = ClrId From Trs_AddPanelEntry Where Id=@OldId   
SELECT @OldSizeId = @SizeId   
SELECT @OldSourceStageId = SourceStageId From Trs_AddPanelEntry Where Id=@OldId   
SELECT @OldStockQty = ProdPcs From Trs_AddPanelEntryQty Where Id=@OldId  and Sizid = @SizeId    
SELECT @LotId = IsNull(LotId,0) From Trs_AddPanelEntry Where Id=@OldId    

SELECT @OldStockQty = @oldpcs

if @OldStageId =-2  
begin   
SELECt @OldSourceStageId = -2  
end  
begin  
 
if @OldFinalStage='S'    
begin    

If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On    Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId INNER JOIN Trs_AddPanelAsm_SourceDtl ON  Panel_StockTableQty.CompID = Trs_AddPanelAsm_SourceDtl.CompId  AND  Panel_StockTable.PartId = Trs_AddPanelAsm_SourceDtl.PartId And Panel_StockTable.StageId  = Trs_AddPanelAsm_SourceDtl.SourceStageId where coycode=@Oldcoycode   and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotId and GodId=@OldGodId and PartyId=@OldPartyId)  
 begin   
 
Select @OldPcsStockId=PcsStockId From Panel_StockTable where coycode=@Oldcoycode and  Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotId   and Stageid=@OldStageid and GodId=@OldGodId and PartyId=@OldPartyId  /*Print 'as2' Print 'as' + str(@OldOrdid) 
Print 'as' + (@OldStyleno) Print 'as' + str(@oldSizeId)  Print 'as' + str(@Id) Print 'as' + str(@OldSourceStageId)  Print 'as' + str(@OldStageid) Print 'as' + str(@Lotid)     Print 'as' + str(@OldColid)  Print 'as' + str(@OldPartyid) */   
If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId INNER JOIN Trs_AddPanelAsm_SourceDtl ON   Panel_StockTableQty.CompID = Trs_AddPanelAsm_SourceDtl.CompId and  Panel_StockTable.PartId = Trs_AddPanelAsm_SourceDtl.PartId And Panel_StockTable.StageId  = Trs_AddPanelAsm_SourceDtl.SourceStageId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotID = @LotId and  GodId=@OldGodId and PartyId=@OldPartyId    and Panel_StockTableQty.SizeId=@OldSizeId  and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0) =0 Then 0 Else @RejectionTypeId End)   
Begin     
If @OldStageId=1 And ( Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Piece'  
Begin  
 
Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+(@OldStockQty*IsNull(OrderQtyDtl.PcsPerColor,1)) From Panel_StockTableQty    Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Panel_StockTable.Ordid = OrderQtyDtl.Ordid And Panel_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.ColId = Panel_StockTableQty.Colid   And    OrderQtyDtl.SizeId = Panel_StockTableQty.SizeId And OrderQtyDtl.PartId = Panel_StockTable.PartID  LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 INNER JOIN Trs_AddPanelAsm_SourceDtl ON  Panel_StockTableQty.compID = Trs_AddPanelAsm_SourceDtl.compID And Panel_StockTable.PartId = Trs_AddPanelAsm_SourceDtl.PartId And    Panel_StockTable.StageId  = Trs_AddPanelAsm_SourceDtl.SourceStageId where Trs_AddPanelAsm_SourceDtl.Id = @OldId and coycode=@Oldcoycode and Panel_StockTable.Ordid=@OldOrdid and Panel_StockTable.StyleNo=@OldStyleNo and LotID = @LotId and GodId=@OldGodId and PartyId=@OldPartyId     And Panel_StockTableQty.SizeId=@OldSizeId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End    
End   
End   
Else  
 Begin     
If @OldStageId=1  
Begin   
INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@OldPcsStockId,@OldColId,@OldSizeid,@OldStockQty,@OldStockQty,Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End,   Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End)   
End   
If @OldStageId<>1 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Piece'   
begin    
 
 
Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-(@OldStockQty * isnull(orderqtydtl.pcspercolor,1)) ,  Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty-@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Panel_StockTable.Ordid = OrderQtyDtl.Ordid And Panel_StockTable.Styleno = OrderQtyDtl.StyleNo   And OrderQtyDtl.CmbClrID = Panel_StockTableQty.Colid  And OrderQtyDtl.SizeId = Panel_StockTableQty.SizeId  /*And OrderQtyDtl.Pa
rtId = Panel_StockTable.PartID  */ LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 where coycode=@Oldcoycode and Panel_StockTable.Ordid=@OldOrdid   and Panel_StockTable.StyleNo=@OldStyleNo and LotID = @LotId and Stageid=@OldStageId and Panel_StockTable.PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0    End   
End   
End   
Else   
begin   
If @OldStageId<>1   
Begin  
Select @OldPcsStockId=Max(IsNull(PcsStockId,0))+1 From Panel_StockTable   
INSERT INTO Panel_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotId) VALUES (@OldCoycode,@OldOrdid,@OldStyleNo,@OldSourceStageid,@OldPartId,@OldSeqNo,@OldGodId,@OldPcsStockId,@OldPartyId,@LotId)    
INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@OldPcsStockId,@OldColId,@OldSizeid,@OldStockQty,@OldStockQty,Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End,Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End)   
End   
End   
End   
End   
 
Select @Id=@Id   
Select @Coycode = CoyId From Trs_AddPanelEntry Where Id=@Id   
select @PartyId = 0  
SELECT @Ordid = OrdId From Trs_AddPanelEntry    Where Id=@Id   
SELECT @StyleNo = StyleNo From Trs_AddPanelEntry Where Id=@Id   SELECT @Stageid = StageId From Trs_AddPanelEntry Where Id=@Id  
SELECT @PartId = PartId From Trs_AddPanelEntry Where Id=@Id   
SELECT @GodId = GodId From Trs_AddPanelEntry Where Id=@Id   
Select @SeqNo = SeqNo From Trs_AddPanelEntry Inner Join Prod_Sequence On Trs_AddPanelEntry.OrdId=Prod_Sequence.OrdId And Trs_AddPanelEntry.StyleNo=Prod_Sequence.StyleNo And Trs_AddPanelEntry.StageId=Prod_Sequence.StageId    Where Id=@Id  
SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_AddPanelEntry Inner Join Mas_JobWrkComp On Trs_AddPanelEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On
 Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_AddPanelEntry.Id=@Id  
SELECT @ColId = ClrId From Trs_AddPanelEntry Where Id=@Id   
SELECT @SizeId = @SizeId   
Select @SourceStageId = SourceStageId From Trs_AddPanelEntry Where Id=@Id   
SELECT @StockQty = @ProdPcs   
 begin   

if @FinalStage='S'      
begin    

If EXISTS (select * from Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId =@LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId)    
begin    

Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  If EXISTS    (select * from Panel_StockTable Inner Join
 Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotID = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and  Panel_StockTableQty.SizeId=@SizeId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0)      
Begin   
If @StageId<>1 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'   
Begin     
 

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+(@StockQty),Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty+@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Panel_StockTable.Ordid = OrderQtyDtl.Ordid    And Panel_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.CmbClrID = Panel_StockTableQty.Colid  And OrderQtyDtl.SizeId = Panel_StockTableQty.SizeId /*And OrderQtyDtl.PartId = Panel_StockTable.PartID */ LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	   where  coycode=@coycode and Panel_StockTable.Ordid=@Ordid and Panel_StockTable.StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and Panel_StockTable.PartId=@PartId and GodId=@GodId and PartyId=@PartyId    and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0  
End   
End   
Else   
Begin   
INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0)  
End   
End  
Else 
begin   
Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Panel_StockTable      
INSERT INTO Panel_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID)   
INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0)  
End   
If @StageId=1 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'   
  begin  /* colid removed by asl for packing qty reduce means update in pre stage - in above already added qty here diff qty minus */  
 
  Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-(@StockQty*IsNull(OrderQtyDtl.PcsPerColor,1)) From Panel_StockTableQty Inner Join Panel_StockTable  On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Panel_StockTable.Ordid = OrderQtyDtl.Ordid And Panel_StockTable.Styleno = OrderQtyDtl.StyleNo    And OrderQtyDtl.ColId = Panel_StockTableQty.Colid  And OrderQtyDtl.SizeId = Panel_StockTableQty.SizeId And OrderQtyDtl.PartId = Panel_StockTable.PartID  LEFT OUTER JOIN Mas_Lot ON OrderQtyDtl.LotNo = Mas_Lot.LotName	 INNER JOIN Trs_AddPanelAsm_SourceDtl ON  Panel_StockTableQty.compID = Trs_AddPanelAsm_SourceDtl.compID And Panel_StockTable.PartId = Trs_AddPanelAsm_SourceDtl.PartId And Panel_StockTable.StageId  = Trs_AddPanelAsm_SourceDtl.SourceStageId where Trs_AddPanelAsm_SourceDtl.id = @id and coycode=@coycode and Panel_StockTable.Ordid=@Ordid    and Panel_StockTable.StyleNo=@StyleNo and 
LotId = @LotId  and GodId=@GodId and PartyId=@PartyId And  Panel_StockTableQty.SizeId=@SizeId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(
@Rework,0)=0 Then 0 Else @RejectionTypeId End     /* /IsNull(OrderQtyDtl.PcsPerColor,1) */
/*
Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-(@OldStockQty),   Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty-
@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId  INNER JOIN OrderQtyDtl on Panel_StockTable.Ordid = OrderQtyDtl.Ordid And Panel_StockTable.Styleno = OrderQtyDtl.StyleNo And OrderQtyDtl.CmbClrID = Panel_StockTableQty.Colid  And OrderQtyDtl.SizeId = Panel_StockTableQty.SizeId /*And OrderQtyDtl.PartId = Panel_StockTable.PartID  */  LEFT OUTER JOIN Mas_Lot ON     OrderQtyDtl.LotNo = Mas_Lot.LotName	 where coycode=@Oldcoycode and Panel_StockTable.Ordid=@OldOrdid and Panel_StockTable.StyleNo=@OldStyleNo and LotId =@Lotid and Stageid=@OldStageId and Panel_StockTable.PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and
 IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0   */
End  
End  
End  
 