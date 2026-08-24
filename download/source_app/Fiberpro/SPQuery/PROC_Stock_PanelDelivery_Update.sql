/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  PANEL_Stock  
; Change Person    :  ASLAM
; Last Change Date :  01/06/2023 10.15 AM 
; =============================================  */  

CREATE PROCEDURE PROC_Stock_PanelDelivery_Update (@ID Int,@StyleNo Varchar(20),@PartId int,@ColId Int,@SizeId Int,@SourceStageID Int,@Pcs Int,@LotNo Varchar(15),@compId as int ) AS  DECLARE @Coycode Int,@Ordid Int,@StageId Int,@GodId Int,@StockQty Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int ,@OldId Int,@OldCoycode Int,@OldOrdid Int,@OldStyleNo Varchar(20),@OldStageId Int,@OldPartId Int,@OldGodId Int,@OldColId Int,@OldSizeId Int,@OldStockQty Int,@OldSourceStageId Int,@OldFinalStage Char(1),@OldSeqNo int,@OldPartyId Int,@OldPcsStockId Int,@ProcessType Char(1),@RejectionTypeId Int ,@OldDelType as Varchar(30),@FinishedStageId int ,@OldBuyerId int  ,@LotId Int   ,@Prod_Without_Lot_Despatch_WithLot as char(1), @LotwiseStockReqd   char(1)   

SELECT @LotwiseStockReqd = isNull(LotwiseStockReqd,'Y') from Options   

SELECT @Prod_Without_Lot_Despatch_WithLot = isNull(Prod_Without_Lot_Despatch_WithLot,'Y') from Options1    

Select @OldId=@Id    

Select @OldCoycode = Coycode From Trs_Pcs1 Where Id=@OldId     

select @OldPartyId = Party From Trs_Pcs1 Where Id=@OldId     

SELECT @OldOrdid = Ordjobno From Trs_Pcs1 Where Id=@OldId     

SELECT @LotwiseStockReqd = isNull(LotwiseStock,'Y') from Ordermas2 where Ordid=@OldOrdid  

SELECT @OldStageid = TargetStageId From Trs_Pcs1 Where Id=@OldId     

SELECT @OldGodId = GodId From Trs_Pcs1 Where Id=@OldId     

SELECT @ProcessType = ProcessType from trs_pcs1 where id=@oldid     

SELECT @RejectionTypeId = RejectionTypeId from trs_pcs1 where id=@oldid    

Select @OldSeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@StageId      

SELECT @OldFinalStage = Mas_Dept.SemiFinish From Trs_Pcs1 Inner Join Mas_JobWrkComp On Trs_Pcs1.TargetStageID=Mas_JobWrkComp.Id Inner Join

 Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_Pcs1.Id=@OldId      

 SELECT @OldStyleNo = @StyleNo     

 SELECT @OldColId = @ColId     

 SELECT @OldSizeId = @SizeId    

 SELECT @OldPartId = @PartId    Select @OldSourceStageId = @SourceStageID    

 SELECT @OldStockQty = Pcs from trs_Pcs2 where Id = @ID and StyleNo = @StyleNo And colId = @ColId and  PartId = @PartID And SizeID = @SizeId And LotNo= @LotNo    and isNull(compID,0) = @CompID 

 SELECT @OldDelType = DelType From Trs_Pcs1 Where Id=@OldId      

 SELECT @OldBuyerId = Buyer From Trs_Pcs1 Where Id=@OldId       

 if @OldDelType ='Sales'	    

 begin  

 SELECT @FinishedStageID = @OldSourceStageId     

 SELECT @OldBuyerId = 1    

 end  

 else 		   

 begin  

 SELECT  @FinishedStageID = -3     

 SELECT @OldBuyerId = Buyer From Trs_Pcs1 Where Id=@OldId    





    end   /*SELECT Top 1 @FinishedStageID = StageId  From Panel_StockTable A INNER JOIN Mas_JobWrkComp B ON A.StageId = B.ID INNER JOIN Mas_Dept C ON B.DeptId = C.DeptID INNER JOIN Trs_Pcs1 D ON A.ORdid = D.Ordjobno inner join (select Distinct ID,Styleno 


fr



om Trs_Pcs2) E ON D.ID = E.ID and A.Styleno = E.StyleNo Where D.ID = @oldID And SEMIFINISH='F'   and StageId=-3 */  

if ltrim(@LotNo)<>''   	  

SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)     

else   	  

SELECT @LotId = 0     

if Rtrim(@LotwiseStockReqd) ='N' And RTrim(@Prod_Without_Lot_Despatch_WithLot)='Y'    

BEGIN     

SELECT @LotId = 0     

END     

Begin       

if @OldBuyerid >0 and (@OldDelType='Despatch' or @OldDelType ='Sales')       

Begin  /*Insert into tmp_trg Values ('Despatch Update1 + ' + str(@OldstockQty))   Insert into tmp_trg Values ('OldCoycode + ' + str(@OldCoycode))   Insert into tmp_trg Values ('Oldpart + ' + str(@Oldpartid))   Insert into tmp_trg Values ('Stage + ' + str(
@FinishedStageId))   Insert into tmp_trg Values ('OldColid + ' + str(@OldColId)) */        

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId
 where coycode =@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotID and Stageid=@FinishedStageId and PartId=@OldPartId and GodId=@OldGodId and PartyId=0 and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompID=@CompId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0      

End       

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Panel' Or (@OldStageid=@OldSourceStageid)   or (Select Rtrim(IsNull(PcsType,'Piece')) From Mas_JobWrkComp Where Id=@OldStageId)='Bit'    OR (Select IsNull(PcsType,'Piece') From 
Mas_JobWrkComp Where Id=@OldStageId)='Piece' 

Begin         

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@OldStockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId 

where coycode=

@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotID and Stageid=@OldSourceStageid and PartId=@OldPartId and GodId=@OldGodId and PartyId=0 and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompId=@CompID and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End  

End          

if @OldDelType <> 'JobWork Return'       

begin 

  	 Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@OldStockQty From  Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@Oldcoycode and Ordid=@OldOrdid and StyleNo=@OldStyleNo and LotId = @LotID  and Stageid=@OldStageId and PartId=@OldPartId and GodId=@OldGodId and PartyId=@OldPartyId and Panel_StockTableQty.ColId=@OldColid and Panel_StockTableQty.SizeId=@OldSizeId and Panel_StockTableQty.CompID=@CompId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End       

end  

End          

Select @Coycode = Coycode From Trs_Pcs1 Where Id=@Id        

select @PartyId = Party From Trs_Pcs1 Where Id=@Id          

SELECT @Ordid = Ordjobno From Trs_Pcs1 Where Id=@Id          

SELECT @Stageid = TargetStageId From Trs_Pcs1 Where Id=@Id           

SELECT @GodId = GodId From Trs_Pcs1 Where Id=@Id          

Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@Ordid And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@StageId  

SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_Pcs1 Inner Join Mas_JobWrkComp On Trs_Pcs1.TargetStageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_Pcs1.Id=@Id 





         Select @SourceStageId = @SourceStageId         

		 SELECT @StockQty = @Pcs        

		 begin          

		 if @OldDelType <> 'JobWork Return'     

		 BEGIN        

		 Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty+@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID  and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and 

PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompID=@compId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else  @RejectionTypeId End  END    



If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Panel' Or (@Stageid=@SourceStageid)   or (Select Rtrim(IsNull(PcsType,'Piece')) From Mas_JobWrkComp Where Id=@StageId)='Bit'  OR  (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@OldStageId)='Piece' 

Begin      

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID  and Stageid=@SourceStageId and PartId=@PartId and GodId=@GodId and PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompID=@compId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else

 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End       End        



 if @OldBuyerid >0 and (@OldDelType='Despatch'   or @OldDelType ='Sales')   

 Begin    /*Insert into tmp_trg Values ('Despatch Update2 - ' + str(@stockQty))*/       

Update Panel_StockTableQty Set Panel_StockTableQty.StockQty=Panel_StockTableQty.StockQty-@StockQty From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotID and Stageid=@FinishedStageId and PartId=@PartId and GodId=@GodId and PartyId=0 and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompID=@compId

 and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0           

 End        

 End 
