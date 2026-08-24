/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  PANEL_Stock  
; Change Person    :  ASLAM
; Last Change Date :  24/09/2022 10.04 AM 
; =============================================  */  
  
CREATE PROCEDURE PROC_Stock_ProdPanel_Update (@Id Int,@SizeId Int,@ProdPcs Int,@compId int,@oldPcs int)  AS  DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,  @StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int ,@OldId Int,@OldCoycode Int,@OldOrdid Int,@OldStyleNo Varchar(20),@OldStageId Int,@OldPartId Int,@OldGodId Int,@OldColId Int,    @OldSizeId Int,@OldStockQty Int,@OldSourceStageId Int,@OldFinalStage Char(1),@OldSeqNo int,@OldPartyId Int      ,@OldPcsStockId Int,@Rework Int,@RejectionTypeId Int ,@LotNo Varchar(15),@LotID int        Select @OldId=@Id       Select @OldCoycode = CoyId From Trs_AddPanelEntry Where Id=@OldId       select @OldPartyId = 0       SELECT @OldOrdid = OrdId From Trs_AddPanelEntry  Where Id=@OldId   SELECT @OldStyleNo = StyleNo From Trs_AddPanelEntry Where Id=@OldId     SELECT @OldStageid = StageId From Trs_AddPanelEntry Where Id=@OldId    SELECT @OldPartId = PartId From Trs_AddPanelEntry Where Id=@OldId    SELECT @OldGodId = GodId From Trs_AddPanelEntry Where Id=@OldId    SELECT @Rework = Rework From Trs_AddPanelEntry Where Id=@OldId     SELECT @RejectionTypeId = RejectionTypeId From Trs_AddPanelEntry Where Id=@OldId    Select @OldSeqNo = SeqNo From Trs_AddPanelEntry Inner Join Prod_Sequence On 
Trs_AddPanelEntry.OrdId=Prod_Sequence.OrdId And Trs_AddPanelEntry.StyleNo=Prod_Sequence.StyleNo And Trs_AddPanelEntry.StageId=Prod_Sequence.StageId    Where Id=@OldId    SELECT @OldFinalStage = Mas_Dept.SemiFinish From Trs_AddPanelEntry Inner Join Mas_JobWrkComp On Trs_AddPanelEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_AddPanelEntry.Id=@OldId    SELECT @OldColId = ClrId From Trs_AddPanelEntry Where Id=@OldId   SELECT @OldSizeId = @SizeId   SELECT @OldSourceStageId = SourceStageId From Trs_AddPanelEntry Where Id=@OldId   
SELECT @OldStockQty = ProdPcs From Trs_AddPanelEntryQty Where Id=@OldId  and Sizid = @SizeId    
SELECT @OldStockQty = @oldPcs 
 SELECT @LotId = IsNull(LotId,0) From Trs_AddPanelEntry Where Id=@OldId    

if @OldStageId =-2  
begin   
SELECt @OldSourceStageId = -2  
end  
begin  
if @OldFinalStage='F'    
begin   
	SELECT 1
   End   
   End   
   if  @OldFinalStage='S'  BEGIN   /*Print 'as7'  */ If EXISTS   (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotID and Stageid=@OldSourceStageid and PartId=@OldPartId and GodId=@OldGodId and
 PartyId=@OldPartyId)     
 begin       
 
 Select @OldPcsStockId=PcsStockId From Panel_StockTable where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotID and Stageid=@OldStageid and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId   
 
 If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and    Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotId and Stageid=@OldSourceStageid and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When    IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End)  
 
 Begin    /*Print 'as9' */  
 If @OldStageId<>1 And ((Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Piece' OR  (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Panel' )   
 Begin  
Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@OldStockQty,Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty+@OldStockQty From Panel_StockTableQty   Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotId and Stageid=@OldSourceStageid and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When    IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End    
End  
 End   
 Else   
 Begin  
 If @OldStageId<>1  
 Begin      
 INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,CompId) VALUES (@OldPcsStockId,@OldColId,@OldSizeid,@OldStockQty,@OldStockQty,Case When    IsNull(@Rework,0)=0 Then 'G' Else 'M' End,Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End,@CompID)   
 End   
 End   
 End   
 Else   
 begin   
 If @OldStageId<>1   
 Begin   
 Select @OldPcsStockId=Max(IsNull(PcsStockId,0))+1 From Panel_StockTable   
 INSERT INTO  Panel_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotId) VALUES (@OldCoycode,@OldOrdid,@OldStyleNo,@OldSourceStageid,@OldPartId,@OldSeqNo,@OldGodId,@OldPcsStockId,@OldPartyId,@LotId)    INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,CompId) VALUES (@OldPcsStockId,@OldColId,@OldSizeid,@OldStockQty,@OldStockQty,Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End,Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End,@CompID)  
 End  
 End  
 End  
 Select @Id=@Id   
 Select @Coycode = CoyId From Trs_AddPanelEntry Where Id=@Id   
 select @PartyId = 0  
 SELECT @Ordid = OrdId From Trs_AddPanelEntry    Where Id=@Id   
 SELECT @StyleNo = StyleNo From Trs_AddPanelEntry Where Id=@Id   
 SELECT @Stageid = StageId From Trs_AddPanelEntry Where Id=@Id  
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
 if @FinalStage='F'      
 begin    
 SELECT 1
  End  
  End  
  Begin 
  if  @FinalStage='S'      
  BEGIN    
  If EXISTS (select * from Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo 
and LotId =@LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId)    
begin   
Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  
If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On    Panel_StockTable.PcsStockId= Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId =@LotID and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0)  
Begin  
If @StageId<>1 And ((Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'  OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Panel' )
begin   
Update Panel_StockTableQty Set  Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@StockQty,Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty+@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId =@Lotid and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId   and Panel_StockTableQty.CompId=@CompId  and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0 

End /*Aslam  below qry*/ 

 If @StageId=1 And ((Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece' OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Panel')  
 
 begin  
 
 Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@StockQty,Panel_StockTableQty.ProductionQty =Panel_StockTableQty.ProductionQty+@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId    where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId =@LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0 
 End   
 
 If @StageId=-2 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Bit'  
  begin    Update Panel_StockTableQty Set    Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@StockQty,Panel_StockTableQty.ProductionQty =Panel_StockTableQty.ProductionQty+@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId =@LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G'    and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0 End   End  Else   Begin    INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,compID) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0,@CompID)    End  End  Else   begin    Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Panel_StockTable    INSERT INTO Panel_StockTable (Coycode,Ordid,styleNo,Stageid,
PartId,SeqNo,GodId,PcsStockId,PartyId,LotId) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotId)     INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,CompID) VALUES
 (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0,@CompID)   End   
 
 If @StageId<>1 And ((Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'  OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Panel' ) 
 
 begin  Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo  and LotId =@LotID and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0 )=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End    
 
 
 Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@OldStockQty,    Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty-@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId =@Lotid and Stageid=@OldStageId and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0     End /*Aslam below query*/    
 If @StageId=1 And ((Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'    OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Panel' )
 
 Begin     
 

 

 
 
 Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@OldStockQty, Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty-@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId=@LotID and Stageid=@OldStageId and PartId=@OldPartId    and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0  
 
    End If @StageId=-2 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Bit'    Begin       Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@OldStockQty, Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty-@OldStockQty From Panel_StockTableQty     Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId=@LotID and Stageid=@OldStageId and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0     End  End     End 


    