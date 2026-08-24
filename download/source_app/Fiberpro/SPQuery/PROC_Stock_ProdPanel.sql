/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  ASLAM

; Last Change Date :  24/09/2022 10.00 AM 

; =============================================  */  

  

CREATE PROCEDURE PROC_Stock_ProdPanel (@Id Int,@SizeId Int,@ProdPcs Int,@compID int) As DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@Rework Int,@RejectionTypeId Int ,@LotNo Varchar(15),@LotId Int  ,@EntryOption int  ,@ComboID int   

Select @Coycode = CoyId From Trs_AddPanelEntry Where Id=@Id        

Select @PartyId = 0     

SELECT @Ordid = OrdId From Trs_AddPanelEntry Where Id=@Id

SELECT @StyleNo = StyleNo From Trs_AddPanelEntry Where Id=@Id      

SELECT @Stageid = StageId From Trs_AddPanelEntry Where Id=@Id     

SELECT @SourceStageId = SourceStageId From Trs_AddPanelEntry Where Id=@Id     

SELECT @PartId = PartId From Trs_AddPanelEntry Where Id=@Id     

SELECT @GodId = GodId From Trs_AddPanelEntry Where Id=@Id     

SELECT @Rework = Rework From Trs_AddPanelEntry Where Id=@Id     

SELECT @RejectionTypeId = RejectionTypeId From Trs_AddPanelEntry Where Id=@Id     

SELECT @LotID = Isnull(LotID,0) From Trs_AddPanelEntry Where Id=@Id     

Select @SeqNo = SeqNo From Trs_AddPanelEntry Inner Join  Prod_Sequence On Trs_AddPanelEntry.OrdId=Prod_Sequence.OrdId And Trs_AddPanelEntry.StyleNo=Prod_Sequence.StyleNo And Trs_AddPanelEntry.StageId=Prod_Sequence.StageId Where Id=@Id     



SELECT @ComboID = ClrID From Trs_AddPanelEntry Where Id=@Id     

SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_AddPanelEntry Inner Join Mas_JobWrkComp On  Trs_AddPanelEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_AddPanelEntry.Id=@Id     

SELECT @ColId = ClrId From Trs_AddPanelEntry Where Id=@Id      

SELECT @StockQty = @ProdPcs     

Select @EntryOption = EntryOption from OrderStyleDtl Where Ordid= @Ordid And StyleNo = @StyleNo        	

BEGIN   

IF EXISTS (select * from Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and  Stageid = @Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId)      



BEGIN      

Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId      



If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId 
and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=
0)     

Begin     

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty +@StockQty,Panel_StockTableQty.ProductionQty=Panel_StockTableQty.ProductionQty+

@StockQty From  Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId  where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId

 and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and  Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId

 and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0   
 End    
 Else    
 Begin    
 INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,CompId)  VALUES 
(@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0,@compId)   
End   
END     
ELSE     
BEGIN   
Select @PcsStockId=IsNull(Max(PcsStockId),0)+1 From Panel_StockTable   
INSERT INTO Panel_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotId)  VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId,@LotID)    
INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,ProductionQty,GoodPcsFlag,RejectionTypeId,CompId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,@StockQty,'G',0,@compID)   
End      

If @StageId<>1  And @FinalStage='S' And ( (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'  OR      
(Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)= 'Panel' )

BEGIN   
Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and  Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  
Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From 
Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End  
END   
If @StageId=1  And @FinalStage='S' And ((Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece'   OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)= 'Panel' ) and @Rework =1  
BEGIN   
Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and  Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId  
Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(
@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End  END  

 

  	

 

 End 